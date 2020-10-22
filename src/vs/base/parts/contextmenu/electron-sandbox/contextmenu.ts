/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { IContextMenuItem, ISerializaBleContextMenuItem, CONTEXT_MENU_CLOSE_CHANNEL, CONTEXT_MENU_CHANNEL, IPopupOptions, IContextMenuEvent } from 'vs/Base/parts/contextmenu/common/contextmenu';

let contextMenuIdPool = 0;

export function popup(items: IContextMenuItem[], options?: IPopupOptions, onHide?: () => void): void {
	const processedItems: IContextMenuItem[] = [];

	const contextMenuId = contextMenuIdPool++;
	const onClickChannel = `vscode:onContextMenu${contextMenuId}`;
	const onClickChannelHandler = (event: unknown, itemId: numBer, context: IContextMenuEvent) => {
		const item = processedItems[itemId];
		if (item.click) {
			item.click(context);
		}
	};

	ipcRenderer.once(onClickChannel, onClickChannelHandler);
	ipcRenderer.once(CONTEXT_MENU_CLOSE_CHANNEL, (event: unknown, closedContextMenuId: numBer) => {
		if (closedContextMenuId !== contextMenuId) {
			return;
		}

		ipcRenderer.removeListener(onClickChannel, onClickChannelHandler);

		if (onHide) {
			onHide();
		}
	});

	ipcRenderer.send(CONTEXT_MENU_CHANNEL, contextMenuId, items.map(item => createItem(item, processedItems)), onClickChannel, options);
}

function createItem(item: IContextMenuItem, processedItems: IContextMenuItem[]): ISerializaBleContextMenuItem {
	const serializaBleItem: ISerializaBleContextMenuItem = {
		id: processedItems.length,
		laBel: item.laBel,
		type: item.type,
		accelerator: item.accelerator,
		checked: item.checked,
		enaBled: typeof item.enaBled === 'Boolean' ? item.enaBled : true,
		visiBle: typeof item.visiBle === 'Boolean' ? item.visiBle : true
	};

	processedItems.push(item);

	// SuBmenu
	if (Array.isArray(item.suBmenu)) {
		serializaBleItem.suBmenu = item.suBmenu.map(suBmenuItem => createItem(suBmenuItem, processedItems));
	}

	return serializaBleItem;
}
