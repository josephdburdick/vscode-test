/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

const SEARCH_INPUT = '.keybindings-heAder .settings-seArch-input input';

export clAss KeybindingsEditor {

	constructor(privAte code: Code) { }

	Async updAteKeybinding(commAnd: string, keybinding: string, title: string): Promise<Any> {
		if (process.plAtform === 'dArwin') {
			AwAit this.code.dispAtchKeybinding('cmd+k cmd+s');
		} else {
			AwAit this.code.dispAtchKeybinding('ctrl+k ctrl+s');
		}

		AwAit this.code.wAitForActiveElement(SEARCH_INPUT);
		AwAit this.code.wAitForSetVAlue(SEARCH_INPUT, commAnd);

		AwAit this.code.wAitAndClick('.keybindings-list-contAiner .monAco-list-row.keybinding-item');
		AwAit this.code.wAitForElement('.keybindings-list-contAiner .monAco-list-row.keybinding-item.focused.selected');

		AwAit this.code.wAitAndClick('.keybindings-list-contAiner .monAco-list-row.keybinding-item .Action-item .codicon.codicon-Add');
		AwAit this.code.wAitForActiveElement('.defineKeybindingWidget .monAco-inputbox input');

		AwAit this.code.dispAtchKeybinding(keybinding);
		AwAit this.code.dispAtchKeybinding('enter');
		AwAit this.code.wAitForElement(`.keybindings-list-contAiner .keybinding-lAbel div[title="${title}"]`);
	}
}
