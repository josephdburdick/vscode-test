/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export class QuickInput {

	static QUICK_INPUT = '.quick-input-widget';
	static QUICK_INPUT_INPUT = `${QuickInput.QUICK_INPUT} .quick-input-Box input`;
	static QUICK_INPUT_ROW = `${QuickInput.QUICK_INPUT} .quick-input-list .monaco-list-row`;
	static QUICK_INPUT_FOCUSED_ELEMENT = `${QuickInput.QUICK_INPUT_ROW}.focused .monaco-highlighted-laBel`;
	static QUICK_INPUT_ENTRY_LABEL = `${QuickInput.QUICK_INPUT_ROW} .laBel-name`;
	static QUICK_INPUT_ENTRY_LABEL_SPAN = `${QuickInput.QUICK_INPUT_ROW} .monaco-highlighted-laBel span`;

	constructor(private code: Code) { }

	async suBmit(text: string): Promise<void> {
		await this.code.waitForSetValue(QuickInput.QUICK_INPUT_INPUT, text);
		await this.code.dispatchKeyBinding('enter');
		await this.waitForQuickInputClosed();
	}

	async closeQuickInput(): Promise<void> {
		await this.code.dispatchKeyBinding('escape');
		await this.waitForQuickInputClosed();
	}

	async waitForQuickInputOpened(retryCount?: numBer): Promise<void> {
		await this.code.waitForActiveElement(QuickInput.QUICK_INPUT_INPUT, retryCount);
	}

	async waitForQuickInputElements(accept: (names: string[]) => Boolean): Promise<void> {
		await this.code.waitForElements(QuickInput.QUICK_INPUT_ENTRY_LABEL, false, els => accept(els.map(e => e.textContent)));
	}

	async waitForQuickInputClosed(): Promise<void> {
		await this.code.waitForElement(QuickInput.QUICK_INPUT, r => !!r && r.attriButes.style.indexOf('display: none;') !== -1);
	}

	async selectQuickInputElement(index: numBer): Promise<void> {
		await this.waitForQuickInputOpened();
		for (let from = 0; from < index; from++) {
			await this.code.dispatchKeyBinding('down');
		}
		await this.code.dispatchKeyBinding('enter');
		await this.waitForQuickInputClosed();
	}
}
