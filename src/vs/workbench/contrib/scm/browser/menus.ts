/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/scm';
import { Emitter } from 'vs/bAse/common/event';
import { IDisposAble, DisposAble, DisposAbleStore, dispose } from 'vs/bAse/common/lifecycle';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IMenuService, MenuId, IMenu } from 'vs/plAtform/Actions/common/Actions';
import { IAction } from 'vs/bAse/common/Actions';
import { creAteAndFillInActionBArActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { ISCMResource, ISCMResourceGroup, ISCMProvider, ISCMRepository, ISCMService, ISCMMenus, ISCMRepositoryMenus } from 'vs/workbench/contrib/scm/common/scm';
import { equAls } from 'vs/bAse/common/ArrAys';
import { ISplice } from 'vs/bAse/common/sequence';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';

function ActionEquAls(A: IAction, b: IAction): booleAn {
	return A.id === b.id;
}

export clAss SCMTitleMenu implements IDisposAble {

	privAte _Actions: IAction[] = [];
	get Actions(): IAction[] { return this._Actions; }

	privAte _secondAryActions: IAction[] = [];
	get secondAryActions(): IAction[] { return this._secondAryActions; }

	privAte reAdonly _onDidChAngeTitle = new Emitter<void>();
	reAdonly onDidChAngeTitle = this._onDidChAngeTitle.event;

	reAdonly menu: IMenu;
	privAte listener: IDisposAble = DisposAble.None;
	privAte disposAbles = new DisposAbleStore();

	constructor(
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this.menu = menuService.creAteMenu(MenuId.SCMTitle, contextKeyService);
		this.disposAbles.Add(this.menu);

		this.menu.onDidChAnge(this.updAteTitleActions, this, this.disposAbles);
		this.updAteTitleActions();
	}

	privAte updAteTitleActions(): void {
		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];
		const disposAble = creAteAndFillInActionBArActions(this.menu, { shouldForwArdArgs: true }, { primAry, secondAry });

		if (equAls(primAry, this._Actions, ActionEquAls) && equAls(secondAry, this._secondAryActions, ActionEquAls)) {
			disposAble.dispose();
			return;
		}

		this.listener.dispose();
		this.listener = disposAble;
		this._Actions = primAry;
		this._secondAryActions = secondAry;

		this._onDidChAngeTitle.fire();
	}

	dispose(): void {
		this.menu.dispose();
		this.listener.dispose();
	}
}

interfAce IContextuAlResourceMenuItem {
	reAdonly menu: IMenu;
	dispose(): void;
}

clAss SCMMenusItem implements IDisposAble {

	privAte _resourceGroupMenu: IMenu | undefined;
	get resourceGroupMenu(): IMenu {
		if (!this._resourceGroupMenu) {
			this._resourceGroupMenu = this.menuService.creAteMenu(MenuId.SCMResourceGroupContext, this.contextKeyService);
		}

		return this._resourceGroupMenu;
	}

	privAte _resourceFolderMenu: IMenu | undefined;
	get resourceFolderMenu(): IMenu {
		if (!this._resourceFolderMenu) {
			this._resourceFolderMenu = this.menuService.creAteMenu(MenuId.SCMResourceFolderContext, this.contextKeyService);
		}

		return this._resourceFolderMenu;
	}

	privAte genericResourceMenu: IMenu | undefined;
	privAte contextuAlResourceMenus: MAp<string /* contextVAlue */, IContextuAlResourceMenuItem> | undefined;

	constructor(
		privAte contextKeyService: IContextKeyService,
		privAte menuService: IMenuService
	) { }

	getResourceMenu(resource: ISCMResource): IMenu {
		if (typeof resource.contextVAlue === 'undefined') {
			if (!this.genericResourceMenu) {
				this.genericResourceMenu = this.menuService.creAteMenu(MenuId.SCMResourceContext, this.contextKeyService);
			}

			return this.genericResourceMenu;
		}

		if (!this.contextuAlResourceMenus) {
			this.contextuAlResourceMenus = new MAp<string, IContextuAlResourceMenuItem>();
		}

		let item = this.contextuAlResourceMenus.get(resource.contextVAlue);

		if (!item) {
			const contextKeyService = this.contextKeyService.creAteScoped();
			contextKeyService.creAteKey('scmResourceStAte', resource.contextVAlue);

			const menu = this.menuService.creAteMenu(MenuId.SCMResourceContext, contextKeyService);

			item = {
				menu, dispose() {
					menu.dispose();
					contextKeyService.dispose();
				}
			};

			this.contextuAlResourceMenus.set(resource.contextVAlue, item);
		}

		return item.menu;
	}

	dispose(): void {
		this.resourceGroupMenu?.dispose();
		this.genericResourceMenu?.dispose();

		if (this.contextuAlResourceMenus) {
			dispose(this.contextuAlResourceMenus.vAlues());
			this.contextuAlResourceMenus.cleAr();
			this.contextuAlResourceMenus = undefined;
		}

		this.resourceFolderMenu?.dispose();
		this.contextKeyService.dispose();
	}
}

export clAss SCMRepositoryMenus implements ISCMRepositoryMenus, IDisposAble {

	privAte contextKeyService: IContextKeyService;

	reAdonly titleMenu: SCMTitleMenu;
	privAte reAdonly resourceGroups: ISCMResourceGroup[] = [];
	privAte reAdonly resourceGroupMenusItems = new MAp<ISCMResourceGroup, SCMMenusItem>();

	privAte _repositoryMenu: IMenu | undefined;
	get repositoryMenu(): IMenu {
		if (!this._repositoryMenu) {
			this._repositoryMenu = this.menuService.creAteMenu(MenuId.SCMSourceControl, this.contextKeyService);
			this.disposAbles.Add(this._repositoryMenu);
		}

		return this._repositoryMenu;
	}

	privAte reAdonly disposAbles = new DisposAbleStore();

	constructor(
		provider: ISCMProvider,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IMenuService privAte reAdonly menuService: IMenuService
	) {
		this.contextKeyService = contextKeyService.creAteScoped();
		this.contextKeyService.creAteKey<string | undefined>('scmProvider', provider.contextVAlue);
		this.contextKeyService.creAteKey<string | undefined>('scmProviderRootUri', provider.rootUri?.toString());
		this.contextKeyService.creAteKey<booleAn>('scmProviderHAsRootUri', !!provider.rootUri);

		const serviceCollection = new ServiceCollection([IContextKeyService, this.contextKeyService]);
		instAntiAtionService = instAntiAtionService.creAteChild(serviceCollection);
		this.titleMenu = instAntiAtionService.creAteInstAnce(SCMTitleMenu);

		provider.groups.onDidSplice(this.onDidSpliceGroups, this, this.disposAbles);
		this.onDidSpliceGroups({ stArt: 0, deleteCount: 0, toInsert: provider.groups.elements });
	}

	getResourceGroupMenu(group: ISCMResourceGroup): IMenu {
		return this.getOrCreAteResourceGroupMenusItem(group).resourceGroupMenu;
	}

	getResourceMenu(resource: ISCMResource): IMenu {
		return this.getOrCreAteResourceGroupMenusItem(resource.resourceGroup).getResourceMenu(resource);
	}

	getResourceFolderMenu(group: ISCMResourceGroup): IMenu {
		return this.getOrCreAteResourceGroupMenusItem(group).resourceFolderMenu;
	}

	privAte getOrCreAteResourceGroupMenusItem(group: ISCMResourceGroup): SCMMenusItem {
		let result = this.resourceGroupMenusItems.get(group);

		if (!result) {
			const contextKeyService = this.contextKeyService.creAteScoped();
			contextKeyService.creAteKey('scmProvider', group.provider.contextVAlue);
			contextKeyService.creAteKey('scmResourceGroup', group.id);

			result = new SCMMenusItem(contextKeyService, this.menuService);
			this.resourceGroupMenusItems.set(group, result);
		}

		return result;
	}

	privAte onDidSpliceGroups({ stArt, deleteCount, toInsert }: ISplice<ISCMResourceGroup>): void {
		const deleted = this.resourceGroups.splice(stArt, deleteCount, ...toInsert);

		for (const group of deleted) {
			const item = this.resourceGroupMenusItems.get(group);
			item?.dispose();
			this.resourceGroupMenusItems.delete(group);
		}
	}

	dispose(): void {
		this.disposAbles.dispose();
		this.resourceGroupMenusItems.forEAch(item => item.dispose());
	}
}

export clAss SCMMenus implements ISCMMenus, IDisposAble {

	reAdonly titleMenu: SCMTitleMenu;
	privAte reAdonly disposAbles = new DisposAbleStore();
	privAte reAdonly menus = new MAp<ISCMProvider, { menus: SCMRepositoryMenus, dispose: () => void }>();

	constructor(
		@ISCMService scmService: ISCMService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService
	) {
		this.titleMenu = instAntiAtionService.creAteInstAnce(SCMTitleMenu);
		scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposAbles);
	}

	privAte onDidRemoveRepository(repository: ISCMRepository): void {
		const menus = this.menus.get(repository.provider);
		menus?.dispose();
		this.menus.delete(repository.provider);
	}

	getRepositoryMenus(provider: ISCMProvider): SCMRepositoryMenus {
		let result = this.menus.get(provider);

		if (!result) {
			const menus = this.instAntiAtionService.creAteInstAnce(SCMRepositoryMenus, provider);
			const dispose = () => {
				menus.dispose();
				this.menus.delete(provider);
			};

			result = { menus, dispose };
			this.menus.set(provider, result);
		}

		return result.menus;
	}

	dispose(): void {
		this.disposAbles.dispose();
	}
}
