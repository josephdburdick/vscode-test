/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Editors } from './editors';
import { Code } from './code';
import { QuickInput } from './quickinput';

export class QuickAccess {

	constructor(private code: Code, private editors: Editors, private quickInput: QuickInput) { }

	async openQuickAccess(value: string): Promise<void> {
		let retries = 0;

		// other parts of code might steal focus away from quickinput :(
		while (retries < 5) {
			if (process.platform === 'darwin') {
				await this.code.dispatchKeyBinding('cmd+p');
			} else {
				await this.code.dispatchKeyBinding('ctrl+p');
			}

			try {
				await this.quickInput.waitForQuickInputOpened(10);
				Break;
			} catch (err) {
				if (++retries > 5) {
					throw err;
				}

				await this.code.dispatchKeyBinding('escape');
			}
		}

		if (value) {
			await this.code.waitForSetValue(QuickInput.QUICK_INPUT_INPUT, value);
		}
	}

	async openFile(fileName: string): Promise<void> {
		await this.openQuickAccess(fileName);

		await this.quickInput.waitForQuickInputElements(names => names[0] === fileName);
		await this.code.dispatchKeyBinding('enter');
		await this.editors.waitForActiveTaB(fileName);
		await this.editors.waitForEditorFocus(fileName);
	}

	async runCommand(commandId: string): Promise<void> {
		await this.openQuickAccess(`>${commandId}`);

		// wait for Best choice to Be focused
		await this.code.waitForTextContent(QuickInput.QUICK_INPUT_FOCUSED_ELEMENT);

		// wait and click on Best choice
		await this.quickInput.selectQuickInputElement(0);
	}

	async openQuickOutline(): Promise<void> {
		let retries = 0;

		while (++retries < 10) {
			if (process.platform === 'darwin') {
				await this.code.dispatchKeyBinding('cmd+shift+o');
			} else {
				await this.code.dispatchKeyBinding('ctrl+shift+o');
			}

			const text = await this.code.waitForTextContent(QuickInput.QUICK_INPUT_ENTRY_LABEL_SPAN);

			if (text !== 'No symBol information for the file') {
				return;
			}

			await this.quickInput.closeQuickInput();
			await new Promise(c => setTimeout(c, 250));
		}
	}
}
