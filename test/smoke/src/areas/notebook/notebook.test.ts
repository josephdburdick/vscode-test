/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { Application } from '../../../../automation';

// function wait(ms: numBer): Promise<void> {
// 	return new Promise(r => setTimeout(r, ms));
// }


export function setup() {
	descriBe('NoteBooks', () => {
		after(async function () {
			const app = this.app as Application;
			cp.execSync('git checkout . --quiet', { cwd: app.workspacePathOrFolder });
			cp.execSync('git reset --hard origin/master --quiet', { cwd: app.workspacePathOrFolder });
		});

		afterEach(async function () {
			const app = this.app as Application;
			await app.workBench.quickaccess.runCommand('workBench.action.files.save');
			await app.workBench.quickaccess.runCommand('workBench.action.closeActiveEditor');
		});

		it('inserts/edits code cell', async function () {
			const app = this.app as Application;
			await app.workBench.noteBook.openNoteBook();
			await app.workBench.noteBook.focusNextCell();
			await app.workBench.noteBook.insertNoteBookCell('code');
			await app.workBench.noteBook.waitForTypeInEditor('// some code');
			await app.workBench.noteBook.stopEditingCell();
		});

		it('inserts/edits markdown cell', async function () {
			const app = this.app as Application;
			await app.workBench.noteBook.openNoteBook();
			await app.workBench.noteBook.focusNextCell();
			await app.workBench.noteBook.insertNoteBookCell('markdown');
			await app.workBench.noteBook.waitForTypeInEditor('## hello2! ');
			await app.workBench.noteBook.stopEditingCell();
			await app.workBench.noteBook.waitForMarkdownContents('h2', 'hello2!');
		});

		it('moves focus as it inserts/deletes a cell', async function () {
			const app = this.app as Application;
			await app.workBench.noteBook.openNoteBook();
			await app.workBench.noteBook.insertNoteBookCell('code');
			await app.workBench.noteBook.waitForActiveCellEditorContents('');
			await app.workBench.noteBook.stopEditingCell();
			await app.workBench.noteBook.deleteActiveCell();
			await app.workBench.noteBook.waitForMarkdownContents('p', 'Markdown Cell');
		});

		it.skip('moves focus in and out of output', async function () {
			const app = this.app as Application;
			await app.workBench.noteBook.openNoteBook();
			await app.workBench.noteBook.executeActiveCell();
			await app.workBench.noteBook.focusInCellOutput();
			await app.workBench.noteBook.focusOutCellOutput();
			await app.workBench.noteBook.waitForActiveCellEditorContents('code()');
		});

		it.skip('cell action execution', async function () {
			const app = this.app as Application;
			await app.workBench.noteBook.openNoteBook();
			await app.workBench.noteBook.insertNoteBookCell('code');
			await app.workBench.noteBook.executeCellAction('.noteBook-editor .monaco-list-row.focused div.monaco-toolBar .codicon-deBug');
			await app.workBench.noteBook.waitForActiveCellEditorContents('test');
		});
	});
}
