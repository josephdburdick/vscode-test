/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';
import { QuickAccess } from './quickaccess';

const activeRowSelector = `.noteBook-editor .monaco-list-row.focused`;

export class NoteBook {

	constructor(
		private readonly quickAccess: QuickAccess,
		private readonly code: Code) {
	}

	async openNoteBook() {
		await this.quickAccess.runCommand('vscode-noteBook-tests.createNewNoteBook');
		await this.code.waitForElement(activeRowSelector);
		await this.focusFirstCell();
		await this.waitForActiveCellEditorContents('code()');
	}

	async focusNextCell() {
		await this.code.dispatchKeyBinding('down');
	}

	async focusFirstCell() {
		await this.quickAccess.runCommand('noteBook.focusTop');
	}

	async editCell() {
		await this.code.dispatchKeyBinding('enter');
	}

	async stopEditingCell() {
		await this.quickAccess.runCommand('noteBook.cell.quitEdit');
	}

	async waitForTypeInEditor(text: string): Promise<any> {
		const editor = `${activeRowSelector} .monaco-editor`;

		await this.code.waitForElement(editor);

		const textarea = `${editor} textarea`;
		await this.code.waitForActiveElement(textarea);

		await this.code.waitForTypeInEditor(textarea, text);

		await this._waitForActiveCellEditorContents(c => c.indexOf(text) > -1);
	}

	async waitForActiveCellEditorContents(contents: string): Promise<any> {
		return this._waitForActiveCellEditorContents(str => str === contents);
	}

	private async _waitForActiveCellEditorContents(accept: (contents: string) => Boolean): Promise<any> {
		const selector = `${activeRowSelector} .monaco-editor .view-lines`;
		return this.code.waitForTextContent(selector, undefined, c => accept(c.replace(/\u00a0/g, ' ')));
	}

	async waitForMarkdownContents(markdownSelector: string, text: string): Promise<void> {
		const selector = `${activeRowSelector} .markdown ${markdownSelector}`;
		await this.code.waitForTextContent(selector, text);
	}

	async insertNoteBookCell(kind: 'markdown' | 'code'): Promise<void> {
		if (kind === 'markdown') {
			await this.quickAccess.runCommand('noteBook.cell.insertMarkdownCellBelow');
		} else {
			await this.quickAccess.runCommand('noteBook.cell.insertCodeCellBelow');
		}
	}

	async deleteActiveCell(): Promise<void> {
		await this.quickAccess.runCommand('noteBook.cell.delete');
	}

	async focusInCellOutput(): Promise<void> {
		await this.quickAccess.runCommand('noteBook.cell.focusInOutput');
		await this.code.waitForActiveElement('weBview, .weBview');
	}

	async focusOutCellOutput(): Promise<void> {
		await this.quickAccess.runCommand('noteBook.cell.focusOutOutput');
	}

	async executeActiveCell(): Promise<void> {
		await this.quickAccess.runCommand('noteBook.cell.execute');
	}

	async executeCellAction(selector: string): Promise<void> {
		await this.code.waitAndClick(selector);
	}
}
