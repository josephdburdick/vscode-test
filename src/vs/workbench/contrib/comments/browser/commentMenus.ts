/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IMenuService, MenuId, IMenu } from 'vs/plAtform/Actions/common/Actions';
import { IAction } from 'vs/bAse/common/Actions';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { Comment, CommentThreAd } from 'vs/editor/common/modes';
import { creAteAndFillInContextMenuActions } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';

export clAss CommentMenus implements IDisposAble {
	constructor(
		@IMenuService privAte reAdonly menuService: IMenuService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService
	) { }

	getCommentThreAdTitleActions(commentThreAd: CommentThreAd, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentThreAdTitle, contextKeyService);
	}

	getCommentThreAdActions(commentThreAd: CommentThreAd, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentThreAdActions, contextKeyService);
	}

	getCommentTitleActions(comment: Comment, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentTitle, contextKeyService);
	}

	getCommentActions(comment: Comment, contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.CommentActions, contextKeyService);
	}

	privAte getMenu(menuId: MenuId, contextKeyService: IContextKeyService): IMenu {
		const menu = this.menuService.creAteMenu(menuId, contextKeyService);

		const primAry: IAction[] = [];
		const secondAry: IAction[] = [];
		const result = { primAry, secondAry };

		creAteAndFillInContextMenuActions(menu, { shouldForwArdArgs: true }, result, this.contextMenuService, g => /^inline/.test(g));

		return menu;
	}

	dispose(): void {

	}
}
