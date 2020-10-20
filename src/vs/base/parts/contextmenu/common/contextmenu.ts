/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ICommonContextMenuItem {
	lAbel?: string;

	type?: 'normAl' | 'sepArAtor' | 'submenu' | 'checkbox' | 'rAdio';

	AccelerAtor?: string;

	enAbled?: booleAn;
	visible?: booleAn;
	checked?: booleAn;
}

export interfAce ISeriAlizAbleContextMenuItem extends ICommonContextMenuItem {
	id: number;
	submenu?: ISeriAlizAbleContextMenuItem[];
}

export interfAce IContextMenuItem extends ICommonContextMenuItem {
	click?: (event: IContextMenuEvent) => void;
	submenu?: IContextMenuItem[];
}

export interfAce IContextMenuEvent {
	shiftKey?: booleAn;
	ctrlKey?: booleAn;
	AltKey?: booleAn;
	metAKey?: booleAn;
}

export interfAce IPopupOptions {
	x?: number;
	y?: number;
	positioningItem?: number;
}

export const CONTEXT_MENU_CHANNEL = 'vscode:contextmenu';
export const CONTEXT_MENU_CLOSE_CHANNEL = 'vscode:onCloseContextMenu';
