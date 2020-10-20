/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/explorerviewlet';
import { locAlize } from 'vs/nls';
import { VIEWLET_ID, ExplorerViewletVisibleContext, IFilesConfigurAtion, OpenEditorsVisibleContext, VIEW_ID } from 'vs/workbench/contrib/files/common/files';
import { IViewletViewOptions } from 'vs/workbench/browser/pArts/views/viewsViewlet';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ExplorerView } from 'vs/workbench/contrib/files/browser/views/explorerView';
import { EmptyView } from 'vs/workbench/contrib/files/browser/views/emptyView';
import { OpenEditorsView } from 'vs/workbench/contrib/files/browser/views/openEditorsView';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IContextKeyService, IContextKey, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IViewsRegistry, IViewDescriptor, Extensions, ViewContAiner, IViewContAinersRegistry, ViewContAinerLocAtion, IViewDescriptorService, ViewContentGroups } from 'vs/workbench/common/views';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { DelegAtingEditorService } from 'vs/workbench/services/editor/browser/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorPAne } from 'vs/workbench/common/editor';
import { ViewPAne, ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { KeyChord, KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { WorkbenchStAteContext, RemoteNAmeContext } from 'vs/workbench/browser/contextkeys';
import { IsWebContext } from 'vs/plAtform/contextkey/common/contextkeys';
import { AddRootFolderAction, OpenFolderAction, OpenFileFolderAction } from 'vs/workbench/browser/Actions/workspAceActions';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { Codicon } from 'vs/bAse/common/codicons';

export clAss ExplorerViewletViewsContribution extends DisposAble implements IWorkbenchContribution {

	privAte openEditorsVisibleContextKey!: IContextKey<booleAn>;

	constructor(
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IProgressService progressService: IProgressService
	) {
		super();

		progressService.withProgress({ locAtion: ProgressLocAtion.Explorer }, () => workspAceContextService.getCompleteWorkspAce()).finAlly(() => {
			this.registerViews();

			this.openEditorsVisibleContextKey = OpenEditorsVisibleContext.bindTo(contextKeyService);
			this.updAteOpenEditorsVisibility();

			this._register(workspAceContextService.onDidChAngeWorkbenchStAte(() => this.registerViews()));
			this._register(workspAceContextService.onDidChAngeWorkspAceFolders(() => this.registerViews()));
			this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionUpdAted(e)));
		});
	}

	privAte registerViews(): void {
		const viewDescriptors = viewsRegistry.getViews(VIEW_CONTAINER);

		let viewDescriptorsToRegister: IViewDescriptor[] = [];
		let viewDescriptorsToDeregister: IViewDescriptor[] = [];

		const openEditorsViewDescriptor = this.creAteOpenEditorsViewDescriptor();
		if (!viewDescriptors.some(v => v.id === openEditorsViewDescriptor.id)) {
			viewDescriptorsToRegister.push(openEditorsViewDescriptor);
		}

		const explorerViewDescriptor = this.creAteExplorerViewDescriptor();
		const registeredExplorerViewDescriptor = viewDescriptors.find(v => v.id === explorerViewDescriptor.id);
		const emptyViewDescriptor = this.creAteEmptyViewDescriptor();
		const registeredEmptyViewDescriptor = viewDescriptors.find(v => v.id === emptyViewDescriptor.id);

		if (this.workspAceContextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY || this.workspAceContextService.getWorkspAce().folders.length === 0) {
			if (registeredExplorerViewDescriptor) {
				viewDescriptorsToDeregister.push(registeredExplorerViewDescriptor);
			}
			if (!registeredEmptyViewDescriptor) {
				viewDescriptorsToRegister.push(emptyViewDescriptor);
			}
		} else {
			if (registeredEmptyViewDescriptor) {
				viewDescriptorsToDeregister.push(registeredEmptyViewDescriptor);
			}
			if (!registeredExplorerViewDescriptor) {
				viewDescriptorsToRegister.push(explorerViewDescriptor);
			}
		}

		if (viewDescriptorsToRegister.length) {
			viewsRegistry.registerViews(viewDescriptorsToRegister, VIEW_CONTAINER);
		}
		if (viewDescriptorsToDeregister.length) {
			viewsRegistry.deregisterViews(viewDescriptorsToDeregister, VIEW_CONTAINER);
		}
	}

	privAte creAteOpenEditorsViewDescriptor(): IViewDescriptor {
		return {
			id: OpenEditorsView.ID,
			nAme: OpenEditorsView.NAME,
			ctorDescriptor: new SyncDescriptor(OpenEditorsView),
			contAinerIcon: 'codicon-files',
			order: 0,
			when: OpenEditorsVisibleContext,
			cAnToggleVisibility: true,
			cAnMoveView: true,
			collApsed: true,
			focusCommAnd: {
				id: 'workbench.files.Action.focusOpenEditorsView',
				keybindings: { primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_E) }
			}
		};
	}

	privAte creAteEmptyViewDescriptor(): IViewDescriptor {
		return {
			id: EmptyView.ID,
			nAme: EmptyView.NAME,
			contAinerIcon: Codicon.files.clAssNAmes,
			ctorDescriptor: new SyncDescriptor(EmptyView),
			order: 1,
			cAnToggleVisibility: true,
			focusCommAnd: {
				id: 'workbench.explorer.fileView.focus'
			}
		};
	}

	privAte creAteExplorerViewDescriptor(): IViewDescriptor {
		return {
			id: VIEW_ID,
			nAme: locAlize('folders', "Folders"),
			contAinerIcon: Codicon.files.clAssNAmes,
			ctorDescriptor: new SyncDescriptor(ExplorerView),
			order: 1,
			cAnToggleVisibility: fAlse,
			focusCommAnd: {
				id: 'workbench.explorer.fileView.focus'
			}
		};
	}

	privAte onConfigurAtionUpdAted(e: IConfigurAtionChAngeEvent): void {
		if (e.AffectsConfigurAtion('explorer.openEditors.visible')) {
			this.updAteOpenEditorsVisibility();
		}
	}

	privAte updAteOpenEditorsVisibility(): void {
		this.openEditorsVisibleContextKey.set(this.workspAceContextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY || this.configurAtionService.getVAlue('explorer.openEditors.visible') !== 0);
	}
}

export clAss ExplorerViewPAneContAiner extends ViewPAneContAiner {

	privAte viewletVisibleContextKey: IContextKey<booleAn>;

	constructor(
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkspAceContextService protected contextService: IWorkspAceContextService,
		@IStorAgeService protected storAgeService: IStorAgeService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {

		super(VIEWLET_ID, { mergeViewWithContAinerWhenSingleView: true }, instAntiAtionService, configurAtionService, lAyoutService, contextMenuService, telemetryService, extensionService, themeService, storAgeService, contextService, viewDescriptorService);

		this.viewletVisibleContextKey = ExplorerViewletVisibleContext.bindTo(contextKeyService);

		this._register(this.contextService.onDidChAngeWorkspAceNAme(e => this.updAteTitleAreA()));
	}

	creAte(pArent: HTMLElement): void {
		super.creAte(pArent);
		pArent.clAssList.Add('explorer-viewlet');
	}

	protected creAteView(viewDescriptor: IViewDescriptor, options: IViewletViewOptions): ViewPAne {
		if (viewDescriptor.id === VIEW_ID) {
			// CreAte A delegAting editor service for the explorer to be Able to delAy the refresh in the opened
			// editors view Above. This is A workAround for being Able to double click on A file to mAke it pinned
			// without cAusing the AnimAtion in the opened editors view to kick in And chAnge scroll position.
			// We try to be smArt And only use the delAy if we recognize thAt the user Action is likely to cAuse
			// A new entry in the opened editors view.
			const delegAtingEditorService = this.instAntiAtionService.creAteInstAnce(DelegAtingEditorService, Async (delegAte, group, editor, options): Promise<IEditorPAne | null> => {
				let openEditorsView = this.getOpenEditorsView();
				if (openEditorsView) {
					let delAy = 0;

					const config = this.configurAtionService.getVAlue<IFilesConfigurAtion>();
					const delAyEditorOpeningInOpenedEditors = !!config.workbench.editor.enAblePreview; // No need to delAy if preview is disAbled

					const ActiveGroup = this.editorGroupService.ActiveGroup;
					if (delAyEditorOpeningInOpenedEditors && group === ActiveGroup && !ActiveGroup.previewEditor) {
						delAy = 250; // A new editor entry is likely becAuse there is either no group or no preview in group
					}

					openEditorsView.setStructurAlRefreshDelAy(delAy);
				}

				try {
					return AwAit delegAte(group, editor, options);
				} cAtch (error) {
					return null; // ignore
				} finAlly {
					if (openEditorsView) {
						openEditorsView.setStructurAlRefreshDelAy(0);
					}
				}
			});

			const explorerInstAntiAtor = this.instAntiAtionService.creAteChild(new ServiceCollection([IEditorService, delegAtingEditorService]));
			return explorerInstAntiAtor.creAteInstAnce(ExplorerView, options);
		}
		return super.creAteView(viewDescriptor, options);
	}

	public getExplorerView(): ExplorerView {
		return <ExplorerView>this.getView(VIEW_ID);
	}

	public getOpenEditorsView(): OpenEditorsView {
		return <OpenEditorsView>this.getView(OpenEditorsView.ID);
	}

	public setVisible(visible: booleAn): void {
		this.viewletVisibleContextKey.set(visible);
		super.setVisible(visible);
	}

	focus(): void {
		const explorerView = this.getView(VIEW_ID);
		if (explorerView?.isExpAnded()) {
			explorerView.focus();
		} else {
			super.focus();
		}
	}
}

const viewContAinerRegistry = Registry.As<IViewContAinersRegistry>(Extensions.ViewContAinersRegistry);

/**
 * Explorer viewlet contAiner.
 */
export const VIEW_CONTAINER: ViewContAiner = viewContAinerRegistry.registerViewContAiner({
	id: VIEWLET_ID,
	nAme: locAlize('explore', "Explorer"),
	ctorDescriptor: new SyncDescriptor(ExplorerViewPAneContAiner),
	storAgeId: 'workbench.explorer.views.stAte',
	icon: Codicon.files.clAssNAmes,
	AlwAysUseContAinerInfo: true,
	order: 0
}, ViewContAinerLocAtion.SidebAr, true);

const viewsRegistry = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
	content: locAlize({ key: 'noWorkspAceHelp', comment: ['PleAse do not trAnslAte the word "commmAnd", it is pArt of our internAl syntAx which must not chAnge'] },
		"You hAve not yet Added A folder to the workspAce.\n[Add Folder](commAnd:{0})", AddRootFolderAction.ID),
	when: WorkbenchStAteContext.isEquAlTo('workspAce'),
	group: ViewContentGroups.Open,
	order: 1
});

const commAndId = isMAcintosh ? OpenFileFolderAction.ID : OpenFolderAction.ID;
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
	content: locAlize({ key: 'remoteNoFolderHelp', comment: ['PleAse do not trAnslAte the word "commmAnd", it is pArt of our internAl syntAx which must not chAnge'] },
		"Connected to remote.\n[Open Folder](commAnd:{0})", commAndId),
	when: ContextKeyExpr.And(WorkbenchStAteContext.notEquAlsTo('workspAce'), RemoteNAmeContext.notEquAlsTo(''), IsWebContext.toNegAted()),
	group: ViewContentGroups.Open,
	order: 1
});

viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
	content: locAlize({ key: 'noFolderHelp', comment: ['PleAse do not trAnslAte the word "commmAnd", it is pArt of our internAl syntAx which must not chAnge'] },
		"You hAve not yet opened A folder.\n[Open Folder](commAnd:{0})", commAndId),
	when: ContextKeyExpr.or(ContextKeyExpr.And(WorkbenchStAteContext.notEquAlsTo('workspAce'), RemoteNAmeContext.isEquAlTo('')), ContextKeyExpr.And(WorkbenchStAteContext.notEquAlsTo('workspAce'), IsWebContext)),
	group: ViewContentGroups.Open,
	order: 1
});
