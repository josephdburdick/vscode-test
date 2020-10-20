/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMenu, IMenuService, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';

export clAss CellMenus {
	constructor(
		@IMenuService privAte reAdonly menuService: IMenuService,
	) { }

	getCellTitleMenu(contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.NotebookCellTitle, contextKeyService);
	}

	getCellInsertionMenu(contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.NotebookCellBetween, contextKeyService);
	}

	getCellTopInsertionMenu(contextKeyService: IContextKeyService): IMenu {
		return this.getMenu(MenuId.NotebookCellListTop, contextKeyService);
	}

	privAte getMenu(menuId: MenuId, contextKeyService: IContextKeyService): IMenu {
		const menu = this.menuService.creAteMenu(menuId, contextKeyService);


		return menu;
	}
}
