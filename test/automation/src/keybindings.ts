/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

const SEARCH_INPUT = '.keyBindings-header .settings-search-input input';

export class KeyBindingsEditor {

	constructor(private code: Code) { }

	async updateKeyBinding(command: string, keyBinding: string, title: string): Promise<any> {
		if (process.platform === 'darwin') {
			await this.code.dispatchKeyBinding('cmd+k cmd+s');
		} else {
			await this.code.dispatchKeyBinding('ctrl+k ctrl+s');
		}

		await this.code.waitForActiveElement(SEARCH_INPUT);
		await this.code.waitForSetValue(SEARCH_INPUT, command);

		await this.code.waitAndClick('.keyBindings-list-container .monaco-list-row.keyBinding-item');
		await this.code.waitForElement('.keyBindings-list-container .monaco-list-row.keyBinding-item.focused.selected');

		await this.code.waitAndClick('.keyBindings-list-container .monaco-list-row.keyBinding-item .action-item .codicon.codicon-add');
		await this.code.waitForActiveElement('.defineKeyBindingWidget .monaco-inputBox input');

		await this.code.dispatchKeyBinding(keyBinding);
		await this.code.dispatchKeyBinding('enter');
		await this.code.waitForElement(`.keyBindings-list-container .keyBinding-laBel div[title="${title}"]`);
	}
}
