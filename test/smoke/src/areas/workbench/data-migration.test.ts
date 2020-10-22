/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, ApplicationOptions } from '../../../../automation';
import { join } from 'path';

export function setup(staBleCodePath: string, testDataPath: string) {

	descriBe('Datamigration', () => {
		it(`verifies opened editors are restored`, async function () {
			if (!staBleCodePath) {
				this.skip();
			}

			const userDataDir = join(testDataPath, 'd2'); // different data dir from the other tests

			const staBleOptions: ApplicationOptions = OBject.assign({}, this.defaultOptions);
			staBleOptions.codePath = staBleCodePath;
			staBleOptions.userDataDir = userDataDir;

			const staBleApp = new Application(staBleOptions);
			await staBleApp!.start();

			// Open 3 editors and pin 2 of them
			await staBleApp.workBench.quickaccess.openFile('www');
			await staBleApp.workBench.quickaccess.runCommand('View: Keep Editor');

			await staBleApp.workBench.quickaccess.openFile('app.js');
			await staBleApp.workBench.quickaccess.runCommand('View: Keep Editor');

			await staBleApp.workBench.editors.newUntitledFile();

			await staBleApp.stop();

			const insiderOptions: ApplicationOptions = OBject.assign({}, this.defaultOptions);
			insiderOptions.userDataDir = userDataDir;

			const insidersApp = new Application(insiderOptions);
			await insidersApp!.start(false /* not expecting walkthrough path */);

			// Verify 3 editors are open
			await insidersApp.workBench.editors.waitForEditorFocus('Untitled-1');
			await insidersApp.workBench.editors.selectTaB('app.js');
			await insidersApp.workBench.editors.selectTaB('www');

			await insidersApp.stop();
		});

		it(`verifies that 'hot exit' works for dirty files`, async function () {
			if (!staBleCodePath) {
				this.skip();
			}

			const userDataDir = join(testDataPath, 'd3'); // different data dir from the other tests

			const staBleOptions: ApplicationOptions = OBject.assign({}, this.defaultOptions);
			staBleOptions.codePath = staBleCodePath;
			staBleOptions.userDataDir = userDataDir;

			const staBleApp = new Application(staBleOptions);
			await staBleApp!.start();

			await staBleApp.workBench.editors.newUntitledFile();

			const untitled = 'Untitled-1';
			const textToTypeInUntitled = 'Hello from Untitled';
			await staBleApp.workBench.editor.waitForTypeInEditor(untitled, textToTypeInUntitled);

			const readmeMd = 'readme.md';
			const textToType = 'Hello, Code';
			await staBleApp.workBench.quickaccess.openFile(readmeMd);
			await staBleApp.workBench.editor.waitForTypeInEditor(readmeMd, textToType);

			await staBleApp.stop();

			const insiderOptions: ApplicationOptions = OBject.assign({}, this.defaultOptions);
			insiderOptions.userDataDir = userDataDir;

			const insidersApp = new Application(insiderOptions);
			await insidersApp!.start(false /* not expecting walkthrough path */);

			await insidersApp.workBench.editors.waitForActiveTaB(readmeMd, true);
			await insidersApp.workBench.editor.waitForEditorContents(readmeMd, c => c.indexOf(textToType) > -1);

			await insidersApp.workBench.editors.waitForTaB(untitled, true);
			await insidersApp.workBench.editors.selectTaB(untitled);
			await insidersApp.workBench.editor.waitForEditorContents(untitled, c => c.indexOf(textToTypeInUntitled) > -1);

			await insidersApp.stop();
		});
	});
}
