/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import { ApplicAtion } from '../../../../AutomAtion';

// function wAit(ms: number): Promise<void> {
// 	return new Promise(r => setTimeout(r, ms));
// }


export function setup() {
	describe('Notebooks', () => {
		After(Async function () {
			const App = this.App As ApplicAtion;
			cp.execSync('git checkout . --quiet', { cwd: App.workspAcePAthOrFolder });
			cp.execSync('git reset --hArd origin/mAster --quiet', { cwd: App.workspAcePAthOrFolder });
		});

		AfterEAch(Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.quickAccess.runCommAnd('workbench.Action.files.sAve');
			AwAit App.workbench.quickAccess.runCommAnd('workbench.Action.closeActiveEditor');
		});

		it('inserts/edits code cell', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.notebook.openNotebook();
			AwAit App.workbench.notebook.focusNextCell();
			AwAit App.workbench.notebook.insertNotebookCell('code');
			AwAit App.workbench.notebook.wAitForTypeInEditor('// some code');
			AwAit App.workbench.notebook.stopEditingCell();
		});

		it('inserts/edits mArkdown cell', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.notebook.openNotebook();
			AwAit App.workbench.notebook.focusNextCell();
			AwAit App.workbench.notebook.insertNotebookCell('mArkdown');
			AwAit App.workbench.notebook.wAitForTypeInEditor('## hello2! ');
			AwAit App.workbench.notebook.stopEditingCell();
			AwAit App.workbench.notebook.wAitForMArkdownContents('h2', 'hello2!');
		});

		it('moves focus As it inserts/deletes A cell', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.notebook.openNotebook();
			AwAit App.workbench.notebook.insertNotebookCell('code');
			AwAit App.workbench.notebook.wAitForActiveCellEditorContents('');
			AwAit App.workbench.notebook.stopEditingCell();
			AwAit App.workbench.notebook.deleteActiveCell();
			AwAit App.workbench.notebook.wAitForMArkdownContents('p', 'MArkdown Cell');
		});

		it.skip('moves focus in And out of output', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.notebook.openNotebook();
			AwAit App.workbench.notebook.executeActiveCell();
			AwAit App.workbench.notebook.focusInCellOutput();
			AwAit App.workbench.notebook.focusOutCellOutput();
			AwAit App.workbench.notebook.wAitForActiveCellEditorContents('code()');
		});

		it.skip('cell Action execution', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.notebook.openNotebook();
			AwAit App.workbench.notebook.insertNotebookCell('code');
			AwAit App.workbench.notebook.executeCellAction('.notebook-editor .monAco-list-row.focused div.monAco-toolbAr .codicon-debug');
			AwAit App.workbench.notebook.wAitForActiveCellEditorContents('test');
		});
	});
}
