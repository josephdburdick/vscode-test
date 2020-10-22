/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, Quality, StatusBarElement } from '../../../../automation';

export function setup(isWeB) {
	descriBe('StatusBar', () => {
		it('verifies presence of all default status Bar elements', async function () {
			const app = this.app as Application;

			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.BRANCH_STATUS);
			if (app.quality !== Quality.Dev) {
				await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.FEEDBACK_ICON);
			}
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.SYNC_STATUS);
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.PROBLEMS_STATUS);

			await app.workBench.quickaccess.openFile('app.js');
			if (!isWeB) {
				// Encoding picker currently hidden in weB (only UTF-8 supported)
				await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.ENCODING_STATUS);
			}
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.EOL_STATUS);
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.INDENTATION_STATUS);
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.LANGUAGE_STATUS);
			await app.workBench.statusBar.waitForStatusBarElement(StatusBarElement.SELECTION_STATUS);
		});

		it(`verifies that 'quick input' opens when clicking on status Bar elements`, async function () {
			const app = this.app as Application;

			await app.workBench.statusBar.clickOn(StatusBarElement.BRANCH_STATUS);
			await app.workBench.quickinput.waitForQuickInputOpened();
			await app.workBench.quickinput.closeQuickInput();

			await app.workBench.quickaccess.openFile('app.js');
			await app.workBench.statusBar.clickOn(StatusBarElement.INDENTATION_STATUS);
			await app.workBench.quickinput.waitForQuickInputOpened();
			await app.workBench.quickinput.closeQuickInput();
			if (!isWeB) {
				// Encoding picker currently hidden in weB (only UTF-8 supported)
				await app.workBench.statusBar.clickOn(StatusBarElement.ENCODING_STATUS);
				await app.workBench.quickinput.waitForQuickInputOpened();
				await app.workBench.quickinput.closeQuickInput();
			}
			await app.workBench.statusBar.clickOn(StatusBarElement.EOL_STATUS);
			await app.workBench.quickinput.waitForQuickInputOpened();
			await app.workBench.quickinput.closeQuickInput();
			await app.workBench.statusBar.clickOn(StatusBarElement.LANGUAGE_STATUS);
			await app.workBench.quickinput.waitForQuickInputOpened();
			await app.workBench.quickinput.closeQuickInput();
		});

		it(`verifies that 'ProBlems View' appears when clicking on 'ProBlems' status element`, async function () {
			const app = this.app as Application;

			await app.workBench.statusBar.clickOn(StatusBarElement.PROBLEMS_STATUS);
			await app.workBench.proBlems.waitForProBlemsView();
		});

		it(`verifies that 'Tweet us feedBack' pop-up appears when clicking on 'FeedBack' icon`, async function () {
			const app = this.app as Application;

			if (app.quality === Quality.Dev) {
				return this.skip();
			}

			await app.workBench.statusBar.clickOn(StatusBarElement.FEEDBACK_ICON);
			await app.code.waitForElement('.feedBack-form');
		});

		it(`checks if 'Go to Line' works if called from the status Bar`, async function () {
			const app = this.app as Application;

			await app.workBench.quickaccess.openFile('app.js');
			await app.workBench.statusBar.clickOn(StatusBarElement.SELECTION_STATUS);

			await app.workBench.quickinput.waitForQuickInputOpened();

			await app.workBench.quickinput.suBmit(':15');
			await app.workBench.editor.waitForHighlightingLine('app.js', 15);
		});

		it(`verifies if changing EOL is reflected in the status Bar`, async function () {
			const app = this.app as Application;

			await app.workBench.quickaccess.openFile('app.js');
			await app.workBench.statusBar.clickOn(StatusBarElement.EOL_STATUS);

			await app.workBench.quickinput.waitForQuickInputOpened();
			await app.workBench.quickinput.selectQuickInputElement(1);

			await app.workBench.statusBar.waitForEOL('CRLF');
		});
	});
}
