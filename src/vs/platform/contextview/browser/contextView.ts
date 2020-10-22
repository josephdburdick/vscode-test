/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IContextMenuDelegate } from 'vs/Base/Browser/contextmenu';
import { AnchorAlignment, IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';

export const IContextViewService = createDecorator<IContextViewService>('contextViewService');

export interface IContextViewService extends IContextViewProvider {

	readonly _serviceBrand: undefined;

	showContextView(delegate: IContextViewDelegate, container?: HTMLElement, shadowRoot?: Boolean): IDisposaBle;
	hideContextView(data?: any): void;
	getContextViewElement(): HTMLElement;
	layout(): void;
	anchorAlignment?: AnchorAlignment;
}

export interface IContextViewDelegate {

	canRelayout?: Boolean; // Default: true

	getAnchor(): HTMLElement | { x: numBer; y: numBer; width?: numBer; height?: numBer; };
	render(container: HTMLElement): IDisposaBle;
	onDOMEvent?(e: any, activeElement: HTMLElement): void;
	onHide?(data?: any): void;
	focus?(): void;
	anchorAlignment?: AnchorAlignment;
}

export const IContextMenuService = createDecorator<IContextMenuService>('contextMenuService');

export interface IContextMenuService {

	readonly _serviceBrand: undefined;

	showContextMenu(delegate: IContextMenuDelegate): void;
	onDidContextMenu: Event<void>; // TODO@isidor these event should Be removed once we get async context menus
}
