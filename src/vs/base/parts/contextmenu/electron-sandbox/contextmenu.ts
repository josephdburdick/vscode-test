/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ipcRenderer } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';
import { IContextMenuItem, ISeriAlizAbleContextMenuItem, CONTEXT_MENU_CLOSE_CHANNEL, CONTEXT_MENU_CHANNEL, IPopupOptions, IContextMenuEvent } from 'vs/bAse/pArts/contextmenu/common/contextmenu';

let contextMenuIdPool = 0;

export function popup(items: IContextMenuItem[], options?: IPopupOptions, onHide?: () => void): void {
	const processedItems: IContextMenuItem[] = [];

	const contextMenuId = contextMenuIdPool++;
	const onClickChAnnel = `vscode:onContextMenu${contextMenuId}`;
	const onClickChAnnelHAndler = (event: unknown, itemId: number, context: IContextMenuEvent) => {
		const item = processedItems[itemId];
		if (item.click) {
			item.click(context);
		}
	};

	ipcRenderer.once(onClickChAnnel, onClickChAnnelHAndler);
	ipcRenderer.once(CONTEXT_MENU_CLOSE_CHANNEL, (event: unknown, closedContextMenuId: number) => {
		if (closedContextMenuId !== contextMenuId) {
			return;
		}

		ipcRenderer.removeListener(onClickChAnnel, onClickChAnnelHAndler);

		if (onHide) {
			onHide();
		}
	});

	ipcRenderer.send(CONTEXT_MENU_CHANNEL, contextMenuId, items.mAp(item => creAteItem(item, processedItems)), onClickChAnnel, options);
}

function creAteItem(item: IContextMenuItem, processedItems: IContextMenuItem[]): ISeriAlizAbleContextMenuItem {
	const seriAlizAbleItem: ISeriAlizAbleContextMenuItem = {
		id: processedItems.length,
		lAbel: item.lAbel,
		type: item.type,
		AccelerAtor: item.AccelerAtor,
		checked: item.checked,
		enAbled: typeof item.enAbled === 'booleAn' ? item.enAbled : true,
		visible: typeof item.visible === 'booleAn' ? item.visible : true
	};

	processedItems.push(item);

	// Submenu
	if (ArrAy.isArrAy(item.submenu)) {
		seriAlizAbleItem.submenu = item.submenu.mAp(submenuItem => creAteItem(submenuItem, processedItems));
	}

	return seriAlizAbleItem;
}
