/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { MenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { MenuItemAction } from 'vs/platform/actions/common/actions';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { renderCodicons } from 'vs/Base/Browser/codicons';

export class CodiconActionViewItem extends MenuEntryActionViewItem {
	constructor(
		readonly _action: MenuItemAction,
		keyBindingService: IKeyBindingService,
		notificationService: INotificationService,
		contextMenuService: IContextMenuService
	) {
		super(_action, keyBindingService, notificationService, contextMenuService);
	}
	updateLaBel(): void {
		if (this.options.laBel && this.laBel) {
			DOM.reset(this.laBel, ...renderCodicons(this._commandAction.laBel ?? ''));
		}
	}
}
