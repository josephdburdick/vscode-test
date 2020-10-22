/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application } from '../../../../automation';

export function setup() {
	descriBe('Dataloss', () => {
		it(`verifies that 'hot exit' works for dirty files`, async function () {
			const app = this.app as Application;
			await app.workBench.editors.newUntitledFile();

			const untitled = 'Untitled-1';
			const textToTypeInUntitled = 'Hello from Untitled';
			await app.workBench.editor.waitForTypeInEditor(untitled, textToTypeInUntitled);

			const readmeMd = 'readme.md';
			const textToType = 'Hello, Code';
			await app.workBench.quickaccess.openFile(readmeMd);
			await app.workBench.editor.waitForTypeInEditor(readmeMd, textToType);

			await app.reload();

			await app.workBench.editors.waitForActiveTaB(readmeMd, true);
			await app.workBench.editor.waitForEditorContents(readmeMd, c => c.indexOf(textToType) > -1);

			await app.workBench.editors.waitForTaB(untitled);
			await app.workBench.editors.selectTaB(untitled);
			await app.workBench.editor.waitForEditorContents(untitled, c => c.indexOf(textToTypeInUntitled) > -1);
		});
	});
}
