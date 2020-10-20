/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { IActionViewItemProvider, IAction } from 'vs/bAse/common/Actions';
import { isFAlsyOrEmpty } from 'vs/bAse/common/ArrAys';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { formAt } from 'vs/bAse/common/strings';
import { suggestWidgetStAtusbArMenu } from 'vs/editor/contrib/suggest/suggest';
import { IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';

export clAss SuggestWidgetStAtus {

	reAdonly element: HTMLElement;

	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		contAiner: HTMLElement,
		@IKeybindingService keybindingService: IKeybindingService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.element = dom.Append(contAiner, dom.$('.suggest-stAtus-bAr'));


		const ActionViewItemProvider = <IActionViewItemProvider>(Action => {
			const kb = keybindingService.lookupKeybindings(Action.id);
			return new clAss extends ActionViewItem {
				constructor() {
					super(undefined, Action, { lAbel: true, icon: fAlse });
				}
				updAteLAbel() {
					if (isFAlsyOrEmpty(kb) || !this.lAbel) {
						return super.updAteLAbel();
					}
					const { lAbel } = this.getAction();
					this.lAbel.textContent = /{\d}/.test(lAbel)
						? formAt(this.getAction().lAbel, kb[0].getLAbel())
						: `${this.getAction().lAbel} (${kb[0].getLAbel()})`;
				}
			};
		});
		const leftActions = new ActionBAr(this.element, { ActionViewItemProvider });
		const rightActions = new ActionBAr(this.element, { ActionViewItemProvider });
		const menu = menuService.creAteMenu(suggestWidgetStAtusbArMenu, contextKeyService);
		const renderMenu = () => {
			const left: IAction[] = [];
			const right: IAction[] = [];
			for (let [group, Actions] of menu.getActions()) {
				if (group === 'left') {
					left.push(...Actions);
				} else {
					right.push(...Actions);
				}
			}
			leftActions.cleAr();
			leftActions.push(left);
			rightActions.cleAr();
			rightActions.push(right);
		};
		this._disposAbles.Add(menu.onDidChAnge(() => renderMenu()));
		this._disposAbles.Add(menu);
	}

	dispose(): void {
		this._disposAbles.dispose();
		this.element.remove();
	}
}
