/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ICommonContextMenuItem {
	laBel?: string;

	type?: 'normal' | 'separator' | 'suBmenu' | 'checkBox' | 'radio';

	accelerator?: string;

	enaBled?: Boolean;
	visiBle?: Boolean;
	checked?: Boolean;
}

export interface ISerializaBleContextMenuItem extends ICommonContextMenuItem {
	id: numBer;
	suBmenu?: ISerializaBleContextMenuItem[];
}

export interface IContextMenuItem extends ICommonContextMenuItem {
	click?: (event: IContextMenuEvent) => void;
	suBmenu?: IContextMenuItem[];
}

export interface IContextMenuEvent {
	shiftKey?: Boolean;
	ctrlKey?: Boolean;
	altKey?: Boolean;
	metaKey?: Boolean;
}

export interface IPopupOptions {
	x?: numBer;
	y?: numBer;
	positioningItem?: numBer;
}

export const CONTEXT_MENU_CHANNEL = 'vscode:contextmenu';
export const CONTEXT_MENU_CLOSE_CHANNEL = 'vscode:onCloseContextMenu';
