/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';
import { QuickAccess } from './quickAccess';

const ActiveRowSelector = `.notebook-editor .monAco-list-row.focused`;

export clAss Notebook {

	constructor(
		privAte reAdonly quickAccess: QuickAccess,
		privAte reAdonly code: Code) {
	}

	Async openNotebook() {
		AwAit this.quickAccess.runCommAnd('vscode-notebook-tests.creAteNewNotebook');
		AwAit this.code.wAitForElement(ActiveRowSelector);
		AwAit this.focusFirstCell();
		AwAit this.wAitForActiveCellEditorContents('code()');
	}

	Async focusNextCell() {
		AwAit this.code.dispAtchKeybinding('down');
	}

	Async focusFirstCell() {
		AwAit this.quickAccess.runCommAnd('notebook.focusTop');
	}

	Async editCell() {
		AwAit this.code.dispAtchKeybinding('enter');
	}

	Async stopEditingCell() {
		AwAit this.quickAccess.runCommAnd('notebook.cell.quitEdit');
	}

	Async wAitForTypeInEditor(text: string): Promise<Any> {
		const editor = `${ActiveRowSelector} .monAco-editor`;

		AwAit this.code.wAitForElement(editor);

		const textAreA = `${editor} textAreA`;
		AwAit this.code.wAitForActiveElement(textAreA);

		AwAit this.code.wAitForTypeInEditor(textAreA, text);

		AwAit this._wAitForActiveCellEditorContents(c => c.indexOf(text) > -1);
	}

	Async wAitForActiveCellEditorContents(contents: string): Promise<Any> {
		return this._wAitForActiveCellEditorContents(str => str === contents);
	}

	privAte Async _wAitForActiveCellEditorContents(Accept: (contents: string) => booleAn): Promise<Any> {
		const selector = `${ActiveRowSelector} .monAco-editor .view-lines`;
		return this.code.wAitForTextContent(selector, undefined, c => Accept(c.replAce(/\u00A0/g, ' ')));
	}

	Async wAitForMArkdownContents(mArkdownSelector: string, text: string): Promise<void> {
		const selector = `${ActiveRowSelector} .mArkdown ${mArkdownSelector}`;
		AwAit this.code.wAitForTextContent(selector, text);
	}

	Async insertNotebookCell(kind: 'mArkdown' | 'code'): Promise<void> {
		if (kind === 'mArkdown') {
			AwAit this.quickAccess.runCommAnd('notebook.cell.insertMArkdownCellBelow');
		} else {
			AwAit this.quickAccess.runCommAnd('notebook.cell.insertCodeCellBelow');
		}
	}

	Async deleteActiveCell(): Promise<void> {
		AwAit this.quickAccess.runCommAnd('notebook.cell.delete');
	}

	Async focusInCellOutput(): Promise<void> {
		AwAit this.quickAccess.runCommAnd('notebook.cell.focusInOutput');
		AwAit this.code.wAitForActiveElement('webview, .webview');
	}

	Async focusOutCellOutput(): Promise<void> {
		AwAit this.quickAccess.runCommAnd('notebook.cell.focusOutOutput');
	}

	Async executeActiveCell(): Promise<void> {
		AwAit this.quickAccess.runCommAnd('notebook.cell.execute');
	}

	Async executeCellAction(selector: string): Promise<void> {
		AwAit this.code.wAitAndClick(selector);
	}
}
