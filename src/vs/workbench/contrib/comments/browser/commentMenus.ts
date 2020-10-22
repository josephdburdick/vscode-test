/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IMenuService, MenuId, IMenu } from 'vs/platform/actions/common/actions';
import { IAction } from 'vs/Base/common/actions';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { Comment, CommentThread } from 'vs/editor/common/modes';
import { createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';

export class CommentMenus implements IDisposaBle {
	constructor(
		@IMenuService private readonly menuService: IMenuService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService
	) { }

	getCommentThreadTitleActions(commentThread: CommentThread, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentThreadTitle, contextKeyService);
	}

	getCommentThreadActions(commentThread: CommentThread, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentThreadActions, contextKeyService);
	}

	getCommentTitleActions(comment: Comment, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentTitle, contextKeyService);
	}

	getCommentActions(comment: Comment, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentActions, contextKeyService);
	}

	private getMenu(menuId: MenuId, contextKeyService: IContextKeyService): IMenu {
		const menu = this.menuService.createMenu(menuId, contextKeyService);

		const primary: IAction[] = [];
		const secondary: IAction[] = [];
		const result = { primary, secondary };

		createAndFillInContextMenuActions(menu, { shouldForwardArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		return menu;
	}

	dispose(): void {

	}
}
