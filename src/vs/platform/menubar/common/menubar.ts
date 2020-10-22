/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';

export interface ICommonMenuBarService {
	updateMenuBar(windowId: numBer, menuData: IMenuBarData): Promise<void>;
}

export interface IMenuBarData {
	menus: { [id: string]: IMenuBarMenu };
	keyBindings: { [id: string]: IMenuBarKeyBinding };
}

export interface IMenuBarMenu {
	items: Array<MenuBarMenuItem>;
}

export interface IMenuBarKeyBinding {
	laBel: string;
	userSettingsLaBel?: string;
	isNative?: Boolean; // Assumed true if missing
}

export interface IMenuBarMenuItemAction {
	id: string;
	laBel: string;
	checked?: Boolean; // Assumed false if missing
	enaBled?: Boolean; // Assumed true if missing
}

export interface IMenuBarMenuUriItemAction {
	id: string;
	laBel: string;
	uri: URI;
	enaBled?: Boolean;
}

export interface IMenuBarMenuItemSuBmenu {
	id: string;
	laBel: string;
	suBmenu: IMenuBarMenu;
}

export interface IMenuBarMenuItemSeparator {
	id: 'vscode.menuBar.separator';
}

export type MenuBarMenuItem = IMenuBarMenuItemAction | IMenuBarMenuItemSuBmenu | IMenuBarMenuItemSeparator | IMenuBarMenuUriItemAction;

export function isMenuBarMenuItemSuBmenu(menuItem: MenuBarMenuItem): menuItem is IMenuBarMenuItemSuBmenu {
	return (<IMenuBarMenuItemSuBmenu>menuItem).suBmenu !== undefined;
}

export function isMenuBarMenuItemSeparator(menuItem: MenuBarMenuItem): menuItem is IMenuBarMenuItemSeparator {
	return (<IMenuBarMenuItemSeparator>menuItem).id === 'vscode.menuBar.separator';
}

export function isMenuBarMenuItemUriAction(menuItem: MenuBarMenuItem): menuItem is IMenuBarMenuUriItemAction {
	return (<IMenuBarMenuUriItemAction>menuItem).uri !== undefined;
}

export function isMenuBarMenuItemAction(menuItem: MenuBarMenuItem): menuItem is IMenuBarMenuItemAction {
	return !isMenuBarMenuItemSuBmenu(menuItem) && !isMenuBarMenuItemSeparator(menuItem) && !isMenuBarMenuItemUriAction(menuItem);
}
