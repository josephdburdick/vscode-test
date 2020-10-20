/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Button } from 'vs/bAse/browser/ui/button/button';
import { IAction } from 'vs/bAse/common/Actions';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IMenu } from 'vs/plAtform/Actions/common/Actions';
import { AttAchButtonStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';

export clAss CommentFormActions implements IDisposAble {
	privAte _buttonElements: HTMLElement[] = [];
	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte _Actions: IAction[] = [];

	constructor(
		privAte contAiner: HTMLElement,
		privAte ActionHAndler: (Action: IAction) => void,
		privAte themeService: IThemeService
	) { }

	setActions(menu: IMenu) {
		this._toDispose.cleAr();

		this._buttonElements.forEAch(b => b.remove());

		const groups = menu.getActions({ shouldForwArdArgs: true });
		for (const group of groups) {
			const [, Actions] = group;

			this._Actions = Actions;
			Actions.forEAch(Action => {
				const button = new Button(this.contAiner);
				this._buttonElements.push(button.element);

				this._toDispose.Add(button);
				this._toDispose.Add(AttAchButtonStyler(button, this.themeService));
				this._toDispose.Add(button.onDidClick(() => this.ActionHAndler(Action)));

				button.enAbled = Action.enAbled;
				button.lAbel = Action.lAbel;
			});
		}
	}

	triggerDefAultAction() {
		if (this._Actions.length) {
			let lAstAction = this._Actions[0];

			if (lAstAction.enAbled) {
				this.ActionHAndler(lAstAction);
			}
		}
	}

	dispose() {
		this._toDispose.dispose();
	}
}
