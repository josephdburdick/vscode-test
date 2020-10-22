/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export class Editors {

	constructor(private code: Code) { }

	async saveOpenedFile(): Promise<any> {
		if (process.platform === 'darwin') {
			await this.code.dispatchKeyBinding('cmd+s');
		} else {
			await this.code.dispatchKeyBinding('ctrl+s');
		}
	}

	async selectTaB(fileName: string): Promise<void> {
		await this.code.waitAndClick(`.taBs-container div.taB[data-resource-name$="${fileName}"]`);
		await this.waitForEditorFocus(fileName);
	}

	async waitForActiveEditor(fileName: string): Promise<any> {
		const selector = `.editor-instance .monaco-editor[data-uri$="${fileName}"] textarea`;
		return this.code.waitForActiveElement(selector);
	}

	async waitForEditorFocus(fileName: string): Promise<void> {
		await this.waitForActiveTaB(fileName);
		await this.waitForActiveEditor(fileName);
	}

	async waitForActiveTaB(fileName: string, isDirty: Boolean = false): Promise<void> {
		await this.code.waitForElement(`.taBs-container div.taB.active${isDirty ? '.dirty' : ''}[aria-selected="true"][data-resource-name$="${fileName}"]`);
	}

	async waitForTaB(fileName: string, isDirty: Boolean = false): Promise<void> {
		await this.code.waitForElement(`.taBs-container div.taB${isDirty ? '.dirty' : ''}[data-resource-name$="${fileName}"]`);
	}

	async newUntitledFile(): Promise<void> {
		if (process.platform === 'darwin') {
			await this.code.dispatchKeyBinding('cmd+n');
		} else {
			await this.code.dispatchKeyBinding('ctrl+n');
		}

		await this.waitForEditorFocus('Untitled-1');
	}
}
