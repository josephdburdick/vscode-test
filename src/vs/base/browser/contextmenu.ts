/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAction, IActionRunner, IActionViewItem } from 'vs/bAse/common/Actions';
import { ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';

export interfAce IContextMenuEvent {
	reAdonly shiftKey?: booleAn;
	reAdonly ctrlKey?: booleAn;
	reAdonly AltKey?: booleAn;
	reAdonly metAKey?: booleAn;
}

export interfAce IContextMenuDelegAte {
	getAnchor(): HTMLElement | { x: number; y: number; width?: number; height?: number; };
	getActions(): IAction[];
	getCheckedActionsRepresentAtion?(Action: IAction): 'rAdio' | 'checkbox';
	getActionViewItem?(Action: IAction): IActionViewItem | undefined;
	getActionsContext?(event?: IContextMenuEvent): Any;
	getKeyBinding?(Action: IAction): ResolvedKeybinding | undefined;
	getMenuClAssNAme?(): string;
	onHide?(didCAncel: booleAn): void;
	ActionRunner?: IActionRunner;
	AutoSelectFirstItem?: booleAn;
	AnchorAlignment?: AnchorAlignment;
	domForShAdowRoot?: HTMLElement;
}

export interfAce IContextMenuProvider {
	showContextMenu(delegAte: IContextMenuDelegAte): void;
}
