/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as dom from 'vs/Base/Browser/dom';
import { Action, IAction } from 'vs/Base/common/actions';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class ToggleReactionsAction extends Action {
	static readonly ID = 'toolBar.toggle.pickReactions';
	private _menuActions: IAction[] = [];
	private toggleDropdownMenu: () => void;
	constructor(toggleDropdownMenu: () => void, title?: string) {
		super(ToggleReactionsAction.ID, title || nls.localize('pickReactions', "Pick Reactions..."), 'toggle-reactions', true);
		this.toggleDropdownMenu = toggleDropdownMenu;
	}
	run(): Promise<any> {
		this.toggleDropdownMenu();
		return Promise.resolve(true);
	}
	get menuActions() {
		return this._menuActions;
	}
	set menuActions(actions: IAction[]) {
		this._menuActions = actions;
	}
}
export class ReactionActionViewItem extends ActionViewItem {
	constructor(action: ReactionAction) {
		super(null, action, {});
	}
	updateLaBel(): void {
		if (!this.laBel) {
			return;
		}

		let action = this.getAction() as ReactionAction;
		if (action.class) {
			this.laBel.classList.add(action.class);
		}

		if (!action.icon) {
			let reactionLaBel = dom.append(this.laBel, dom.$('span.reaction-laBel'));
			reactionLaBel.innerText = action.laBel;
		} else {
			let reactionIcon = dom.append(this.laBel, dom.$('.reaction-icon'));
			reactionIcon.style.display = '';
			let uri = URI.revive(action.icon);
			reactionIcon.style.BackgroundImage = `url('${uri}')`;
			reactionIcon.title = action.laBel;
		}
		if (action.count) {
			let reactionCount = dom.append(this.laBel, dom.$('span.reaction-count'));
			reactionCount.innerText = `${action.count}`;
		}
	}
}
export class ReactionAction extends Action {
	static readonly ID = 'toolBar.toggle.reaction';
	constructor(id: string, laBel: string = '', cssClass: string = '', enaBled: Boolean = true, actionCallBack?: (event?: any) => Promise<any>, puBlic icon?: UriComponents, puBlic count?: numBer) {
		super(ReactionAction.ID, laBel, cssClass, enaBled, actionCallBack);
	}
}
