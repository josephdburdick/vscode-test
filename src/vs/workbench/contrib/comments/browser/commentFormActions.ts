/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { IAction } from 'vs/Base/common/actions';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IMenu } from 'vs/platform/actions/common/actions';
import { attachButtonStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';

export class CommentFormActions implements IDisposaBle {
	private _ButtonElements: HTMLElement[] = [];
	private readonly _toDispose = new DisposaBleStore();
	private _actions: IAction[] = [];

	constructor(
		private container: HTMLElement,
		private actionHandler: (action: IAction) => void,
		private themeService: IThemeService
	) { }

	setActions(menu: IMenu) {
		this._toDispose.clear();

		this._ButtonElements.forEach(B => B.remove());

		const groups = menu.getActions({ shouldForwardArgs: true });
		for (const group of groups) {
			const [, actions] = group;

			this._actions = actions;
			actions.forEach(action => {
				const Button = new Button(this.container);
				this._ButtonElements.push(Button.element);

				this._toDispose.add(Button);
				this._toDispose.add(attachButtonStyler(Button, this.themeService));
				this._toDispose.add(Button.onDidClick(() => this.actionHandler(action)));

				Button.enaBled = action.enaBled;
				Button.laBel = action.laBel;
			});
		}
	}

	triggerDefaultAction() {
		if (this._actions.length) {
			let lastAction = this._actions[0];

			if (lastAction.enaBled) {
				this.actionHandler(lastAction);
			}
		}
	}

	dispose() {
		this._toDispose.dispose();
	}
}
