/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';
import { IActionViewItemProvider, IAction } from 'vs/Base/common/actions';
import { isFalsyOrEmpty } from 'vs/Base/common/arrays';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { format } from 'vs/Base/common/strings';
import { suggestWidgetStatusBarMenu } from 'vs/editor/contriB/suggest/suggest';
import { IMenuService } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';

export class SuggestWidgetStatus {

	readonly element: HTMLElement;

	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		container: HTMLElement,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.element = dom.append(container, dom.$('.suggest-status-Bar'));


		const actionViewItemProvider = <IActionViewItemProvider>(action => {
			const kB = keyBindingService.lookupKeyBindings(action.id);
			return new class extends ActionViewItem {
				constructor() {
					super(undefined, action, { laBel: true, icon: false });
				}
				updateLaBel() {
					if (isFalsyOrEmpty(kB) || !this.laBel) {
						return super.updateLaBel();
					}
					const { laBel } = this.getAction();
					this.laBel.textContent = /{\d}/.test(laBel)
						? format(this.getAction().laBel, kB[0].getLaBel())
						: `${this.getAction().laBel} (${kB[0].getLaBel()})`;
				}
			};
		});
		const leftActions = new ActionBar(this.element, { actionViewItemProvider });
		const rightActions = new ActionBar(this.element, { actionViewItemProvider });
		const menu = menuService.createMenu(suggestWidgetStatusBarMenu, contextKeyService);
		const renderMenu = () => {
			const left: IAction[] = [];
			const right: IAction[] = [];
			for (let [group, actions] of menu.getActions()) {
				if (group === 'left') {
					left.push(...actions);
				} else {
					right.push(...actions);
				}
			}
			leftActions.clear();
			leftActions.push(left);
			rightActions.clear();
			rightActions.push(right);
		};
		this._disposaBles.add(menu.onDidChange(() => renderMenu()));
		this._disposaBles.add(menu);
	}

	dispose(): void {
		this._disposaBles.dispose();
		this.element.remove();
	}
}
