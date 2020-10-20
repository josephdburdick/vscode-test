/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ApplicAtion } from '../../../../AutomAtion';

export function setup() {
	describe('DAtAloss', () => {
		it(`verifies thAt 'hot exit' works for dirty files`, Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.editors.newUntitledFile();

			const untitled = 'Untitled-1';
			const textToTypeInUntitled = 'Hello from Untitled';
			AwAit App.workbench.editor.wAitForTypeInEditor(untitled, textToTypeInUntitled);

			const reAdmeMd = 'reAdme.md';
			const textToType = 'Hello, Code';
			AwAit App.workbench.quickAccess.openFile(reAdmeMd);
			AwAit App.workbench.editor.wAitForTypeInEditor(reAdmeMd, textToType);

			AwAit App.reloAd();

			AwAit App.workbench.editors.wAitForActiveTAb(reAdmeMd, true);
			AwAit App.workbench.editor.wAitForEditorContents(reAdmeMd, c => c.indexOf(textToType) > -1);

			AwAit App.workbench.editors.wAitForTAb(untitled);
			AwAit App.workbench.editors.selectTAb(untitled);
			AwAit App.workbench.editor.wAitForEditorContents(untitled, c => c.indexOf(textToTypeInUntitled) > -1);
		});
	});
}
