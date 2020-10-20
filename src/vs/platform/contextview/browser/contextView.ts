/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextMenuDelegAte } from 'vs/bAse/browser/contextmenu';
import { AnchorAlignment, IContextViewProvider } from 'vs/bAse/browser/ui/contextview/contextview';

export const IContextViewService = creAteDecorAtor<IContextViewService>('contextViewService');

export interfAce IContextViewService extends IContextViewProvider {

	reAdonly _serviceBrAnd: undefined;

	showContextView(delegAte: IContextViewDelegAte, contAiner?: HTMLElement, shAdowRoot?: booleAn): IDisposAble;
	hideContextView(dAtA?: Any): void;
	getContextViewElement(): HTMLElement;
	lAyout(): void;
	AnchorAlignment?: AnchorAlignment;
}

export interfAce IContextViewDelegAte {

	cAnRelAyout?: booleAn; // DefAult: true

	getAnchor(): HTMLElement | { x: number; y: number; width?: number; height?: number; };
	render(contAiner: HTMLElement): IDisposAble;
	onDOMEvent?(e: Any, ActiveElement: HTMLElement): void;
	onHide?(dAtA?: Any): void;
	focus?(): void;
	AnchorAlignment?: AnchorAlignment;
}

export const IContextMenuService = creAteDecorAtor<IContextMenuService>('contextMenuService');

export interfAce IContextMenuService {

	reAdonly _serviceBrAnd: undefined;

	showContextMenu(delegAte: IContextMenuDelegAte): void;
	onDidContextMenu: Event<void>; // TODO@isidor these event should be removed once we get Async context menus
}
