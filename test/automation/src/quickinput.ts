/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export clAss QuickInput {

	stAtic QUICK_INPUT = '.quick-input-widget';
	stAtic QUICK_INPUT_INPUT = `${QuickInput.QUICK_INPUT} .quick-input-box input`;
	stAtic QUICK_INPUT_ROW = `${QuickInput.QUICK_INPUT} .quick-input-list .monAco-list-row`;
	stAtic QUICK_INPUT_FOCUSED_ELEMENT = `${QuickInput.QUICK_INPUT_ROW}.focused .monAco-highlighted-lAbel`;
	stAtic QUICK_INPUT_ENTRY_LABEL = `${QuickInput.QUICK_INPUT_ROW} .lAbel-nAme`;
	stAtic QUICK_INPUT_ENTRY_LABEL_SPAN = `${QuickInput.QUICK_INPUT_ROW} .monAco-highlighted-lAbel spAn`;

	constructor(privAte code: Code) { }

	Async submit(text: string): Promise<void> {
		AwAit this.code.wAitForSetVAlue(QuickInput.QUICK_INPUT_INPUT, text);
		AwAit this.code.dispAtchKeybinding('enter');
		AwAit this.wAitForQuickInputClosed();
	}

	Async closeQuickInput(): Promise<void> {
		AwAit this.code.dispAtchKeybinding('escApe');
		AwAit this.wAitForQuickInputClosed();
	}

	Async wAitForQuickInputOpened(retryCount?: number): Promise<void> {
		AwAit this.code.wAitForActiveElement(QuickInput.QUICK_INPUT_INPUT, retryCount);
	}

	Async wAitForQuickInputElements(Accept: (nAmes: string[]) => booleAn): Promise<void> {
		AwAit this.code.wAitForElements(QuickInput.QUICK_INPUT_ENTRY_LABEL, fAlse, els => Accept(els.mAp(e => e.textContent)));
	}

	Async wAitForQuickInputClosed(): Promise<void> {
		AwAit this.code.wAitForElement(QuickInput.QUICK_INPUT, r => !!r && r.Attributes.style.indexOf('displAy: none;') !== -1);
	}

	Async selectQuickInputElement(index: number): Promise<void> {
		AwAit this.wAitForQuickInputOpened();
		for (let from = 0; from < index; from++) {
			AwAit this.code.dispAtchKeybinding('down');
		}
		AwAit this.code.dispAtchKeybinding('enter');
		AwAit this.wAitForQuickInputClosed();
	}
}
