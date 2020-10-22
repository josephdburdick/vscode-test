/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/Base/common/actions';
import { DisposaBle, MutaBleDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { MenuId, IMenuService } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { createAndFillInActionBarActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';

export class ViewMenuActions extends DisposaBle {

	private primaryActions: IAction[] = [];
	private readonly titleActionsDisposaBle = this._register(new MutaBleDisposaBle());
	private secondaryActions: IAction[] = [];
	private contextMenuActions: IAction[] = [];

	private _onDidChangeTitle = this._register(new Emitter<void>());
	readonly onDidChangeTitle: Event<void> = this._onDidChangeTitle.event;

	constructor(
		viewId: string,
		menuId: MenuId,
		contextMenuId: MenuId,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IMenuService private readonly menuService: IMenuService,
	) {
		super();

		const scopedContextKeyService = this._register(this.contextKeyService.createScoped());
		scopedContextKeyService.createKey('view', viewId);

		const menu = this._register(this.menuService.createMenu(menuId, scopedContextKeyService));
		const updateActions = () => {
			this.primaryActions = [];
			this.secondaryActions = [];
			this.titleActionsDisposaBle.value = createAndFillInActionBarActions(menu, { shouldForwardArgs: true }, { primary: this.primaryActions, secondary: this.secondaryActions });
			this._onDidChangeTitle.fire();
		};
		this._register(menu.onDidChange(updateActions));
		updateActions();

		const contextMenu = this._register(this.menuService.createMenu(contextMenuId, scopedContextKeyService));
		const updateContextMenuActions = () => {
			this.contextMenuActions = [];
			this.titleActionsDisposaBle.value = createAndFillInActionBarActions(contextMenu, { shouldForwardArgs: true }, { primary: [], secondary: this.contextMenuActions });
		};
		this._register(contextMenu.onDidChange(updateContextMenuActions));
		updateContextMenuActions();

		this._register(toDisposaBle(() => {
			this.primaryActions = [];
			this.secondaryActions = [];
			this.contextMenuActions = [];
		}));
	}

	getPrimaryActions(): IAction[] {
		return this.primaryActions;
	}

	getSecondaryActions(): IAction[] {
		return this.secondaryActions;
	}

	getContextMenuActions(): IAction[] {
		return this.contextMenuActions;
	}
}

export class ViewContainerMenuActions extends DisposaBle {

	private readonly titleActionsDisposaBle = this._register(new MutaBleDisposaBle());
	private contextMenuActions: IAction[] = [];

	constructor(
		containerId: string,
		contextMenuId: MenuId,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IMenuService private readonly menuService: IMenuService,
	) {
		super();

		const scopedContextKeyService = this._register(this.contextKeyService.createScoped());
		scopedContextKeyService.createKey('container', containerId);

		const contextMenu = this._register(this.menuService.createMenu(contextMenuId, scopedContextKeyService));
		const updateContextMenuActions = () => {
			this.contextMenuActions = [];
			this.titleActionsDisposaBle.value = createAndFillInActionBarActions(contextMenu, { shouldForwardArgs: true }, { primary: [], secondary: this.contextMenuActions });
		};
		this._register(contextMenu.onDidChange(updateContextMenuActions));
		updateContextMenuActions();

		this._register(toDisposaBle(() => {
			this.contextMenuActions = [];
		}));
	}

	getContextMenuActions(): IAction[] {
		return this.contextMenuActions;
	}
}
