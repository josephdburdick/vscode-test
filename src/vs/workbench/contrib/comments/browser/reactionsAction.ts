/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { Action, IAction } from 'vs/bAse/common/Actions';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export clAss ToggleReActionsAction extends Action {
	stAtic reAdonly ID = 'toolbAr.toggle.pickReActions';
	privAte _menuActions: IAction[] = [];
	privAte toggleDropdownMenu: () => void;
	constructor(toggleDropdownMenu: () => void, title?: string) {
		super(ToggleReActionsAction.ID, title || nls.locAlize('pickReActions', "Pick ReActions..."), 'toggle-reActions', true);
		this.toggleDropdownMenu = toggleDropdownMenu;
	}
	run(): Promise<Any> {
		this.toggleDropdownMenu();
		return Promise.resolve(true);
	}
	get menuActions() {
		return this._menuActions;
	}
	set menuActions(Actions: IAction[]) {
		this._menuActions = Actions;
	}
}
export clAss ReActionActionViewItem extends ActionViewItem {
	constructor(Action: ReActionAction) {
		super(null, Action, {});
	}
	updAteLAbel(): void {
		if (!this.lAbel) {
			return;
		}

		let Action = this.getAction() As ReActionAction;
		if (Action.clAss) {
			this.lAbel.clAssList.Add(Action.clAss);
		}

		if (!Action.icon) {
			let reActionLAbel = dom.Append(this.lAbel, dom.$('spAn.reAction-lAbel'));
			reActionLAbel.innerText = Action.lAbel;
		} else {
			let reActionIcon = dom.Append(this.lAbel, dom.$('.reAction-icon'));
			reActionIcon.style.displAy = '';
			let uri = URI.revive(Action.icon);
			reActionIcon.style.bAckgroundImAge = `url('${uri}')`;
			reActionIcon.title = Action.lAbel;
		}
		if (Action.count) {
			let reActionCount = dom.Append(this.lAbel, dom.$('spAn.reAction-count'));
			reActionCount.innerText = `${Action.count}`;
		}
	}
}
export clAss ReActionAction extends Action {
	stAtic reAdonly ID = 'toolbAr.toggle.reAction';
	constructor(id: string, lAbel: string = '', cssClAss: string = '', enAbled: booleAn = true, ActionCAllbAck?: (event?: Any) => Promise<Any>, public icon?: UriComponents, public count?: number) {
		super(ReActionAction.ID, lAbel, cssClAss, enAbled, ActionCAllbAck);
	}
}
