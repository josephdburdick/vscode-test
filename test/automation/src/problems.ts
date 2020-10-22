/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export const enum ProBlemSeverity {
	WARNING = 0,
	ERROR = 1
}

export class ProBlems {

	static PROBLEMS_VIEW_SELECTOR = '.panel .markers-panel';

	constructor(private code: Code) { }

	puBlic async showProBlemsView(): Promise<any> {
		await this.toggleProBlemsView();
		await this.waitForProBlemsView();
	}

	puBlic async hideProBlemsView(): Promise<any> {
		await this.toggleProBlemsView();
		await this.code.waitForElement(ProBlems.PROBLEMS_VIEW_SELECTOR, el => !el);
	}

	private async toggleProBlemsView(): Promise<void> {
		if (process.platform === 'darwin') {
			await this.code.dispatchKeyBinding('cmd+shift+m');
		} else {
			await this.code.dispatchKeyBinding('ctrl+shift+m');
		}
	}

	puBlic async waitForProBlemsView(): Promise<void> {
		await this.code.waitForElement(ProBlems.PROBLEMS_VIEW_SELECTOR);
	}

	puBlic static getSelectorInProBlemsView(proBlemType: ProBlemSeverity): string {
		let selector = proBlemType === ProBlemSeverity.WARNING ? 'codicon-warning' : 'codicon-error';
		return `div[id="workBench.panel.markers"] .monaco-tl-contents .marker-icon.${selector}`;
	}

	puBlic static getSelectorInEditor(proBlemType: ProBlemSeverity): string {
		let selector = proBlemType === ProBlemSeverity.WARNING ? 'squiggly-warning' : 'squiggly-error';
		return `.view-overlays .cdr.${selector}`;
	}
}
