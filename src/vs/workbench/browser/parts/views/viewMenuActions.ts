/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/bAse/common/Actions';
import { DisposAble, MutAbleDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { MenuId, IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { creAteAndFillInActionBArActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';

export clAss ViewMenuActions extends DisposAble {

	privAte primAryActions: IAction[] = [];
	privAte reAdonly titleActionsDisposAble = this._register(new MutAbleDisposAble());
	privAte secondAryActions: IAction[] = [];
	privAte contextMenuActions: IAction[] = [];

	privAte _onDidChAngeTitle = this._register(new Emitter<void>());
	reAdonly onDidChAngeTitle: Event<void> = this._onDidChAngeTitle.event;

	constructor(
		viewId: string,
		menuId: MenuId,
		contextMenuId: MenuId,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IMenuService privAte reAdonly menuService: IMenuService,
	) {
		super();

		const scopedContextKeyService = this._register(this.contextKeyService.creAteScoped());
		scopedContextKeyService.creAteKey('view', viewId);

		const menu = this._register(this.menuService.creAteMenu(menuId, scopedContextKeyService));
		const updAteActions = () => {
			this.primAryActions = [];
			this.secondAryActions = [];
			this.titleActionsDisposAble.vAlue = creAteAndFillInActionBArActions(menu, { shouldForwArdArgs: true }, { primAry: this.primAryActions, secondAry: this.secondAryActions });
			this._onDidChAngeTitle.fire();
		};
		this._register(menu.onDidChAnge(updAteActions));
		updAteActions();

		const contextMenu = this._register(this.menuService.creAteMenu(contextMenuId, scopedContextKeyService));
		const updAteContextMenuActions = () => {
			this.contextMenuActions = [];
			this.titleActionsDisposAble.vAlue = creAteAndFillInActionBArActions(contextMenu, { shouldForwArdArgs: true }, { primAry: [], secondAry: this.contextMenuActions });
		};
		this._register(contextMenu.onDidChAnge(updAteContextMenuActions));
		updAteContextMenuActions();

		this._register(toDisposAble(() => {
			this.primAryActions = [];
			this.secondAryActions = [];
			this.contextMenuActions = [];
		}));
	}

	getPrimAryActions(): IAction[] {
		return this.primAryActions;
	}

	getSecondAryActions(): IAction[] {
		return this.secondAryActions;
	}

	getContextMenuActions(): IAction[] {
		return this.contextMenuActions;
	}
}

export clAss ViewContAinerMenuActions extends DisposAble {

	privAte reAdonly titleActionsDisposAble = this._register(new MutAbleDisposAble());
	privAte contextMenuActions: IAction[] = [];

	constructor(
		contAinerId: string,
		contextMenuId: MenuId,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IMenuService privAte reAdonly menuService: IMenuService,
	) {
		super();

		const scopedContextKeyService = this._register(this.contextKeyService.creAteScoped());
		scopedContextKeyService.creAteKey('contAiner', contAinerId);

		const contextMenu = this._register(this.menuService.creAteMenu(contextMenuId, scopedContextKeyService));
		const updAteContextMenuActions = () => {
			this.contextMenuActions = [];
			this.titleActionsDisposAble.vAlue = creAteAndFillInActionBArActions(contextMenu, { shouldForwArdArgs: true }, { primAry: [], secondAry: this.contextMenuActions });
		};
		this._register(contextMenu.onDidChAnge(updAteContextMenuActions));
		updAteContextMenuActions();

		this._register(toDisposAble(() => {
			this.contextMenuActions = [];
		}));
	}

	getContextMenuActions(): IAction[] {
		return this.contextMenuActions;
	}
}
