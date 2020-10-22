/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction, IActionRunner, IActionViewItem } from 'vs/Base/common/actions';
import { ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';

export interface IContextMenuEvent {
	readonly shiftKey?: Boolean;
	readonly ctrlKey?: Boolean;
	readonly altKey?: Boolean;
	readonly metaKey?: Boolean;
}

export interface IContextMenuDelegate {
	getAnchor(): HTMLElement | { x: numBer; y: numBer; width?: numBer; height?: numBer; };
	getActions(): IAction[];
	getCheckedActionsRepresentation?(action: IAction): 'radio' | 'checkBox';
	getActionViewItem?(action: IAction): IActionViewItem | undefined;
	getActionsContext?(event?: IContextMenuEvent): any;
	getKeyBinding?(action: IAction): ResolvedKeyBinding | undefined;
	getMenuClassName?(): string;
	onHide?(didCancel: Boolean): void;
	actionRunner?: IActionRunner;
	autoSelectFirstItem?: Boolean;
	anchorAlignment?: AnchorAlignment;
	domForShadowRoot?: HTMLElement;
}

export interface IContextMenuProvider {
	showContextMenu(delegate: IContextMenuDelegate): void;
}
