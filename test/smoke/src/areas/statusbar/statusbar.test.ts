/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ApplicAtion, QuAlity, StAtusBArElement } from '../../../../AutomAtion';

export function setup(isWeb) {
	describe('StAtusbAr', () => {
		it('verifies presence of All defAult stAtus bAr elements', Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.BRANCH_STATUS);
			if (App.quAlity !== QuAlity.Dev) {
				AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.FEEDBACK_ICON);
			}
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.SYNC_STATUS);
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.PROBLEMS_STATUS);

			AwAit App.workbench.quickAccess.openFile('App.js');
			if (!isWeb) {
				// Encoding picker currently hidden in web (only UTF-8 supported)
				AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.ENCODING_STATUS);
			}
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.EOL_STATUS);
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.INDENTATION_STATUS);
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.LANGUAGE_STATUS);
			AwAit App.workbench.stAtusbAr.wAitForStAtusbArElement(StAtusBArElement.SELECTION_STATUS);
		});

		it(`verifies thAt 'quick input' opens when clicking on stAtus bAr elements`, Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.BRANCH_STATUS);
			AwAit App.workbench.quickinput.wAitForQuickInputOpened();
			AwAit App.workbench.quickinput.closeQuickInput();

			AwAit App.workbench.quickAccess.openFile('App.js');
			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.INDENTATION_STATUS);
			AwAit App.workbench.quickinput.wAitForQuickInputOpened();
			AwAit App.workbench.quickinput.closeQuickInput();
			if (!isWeb) {
				// Encoding picker currently hidden in web (only UTF-8 supported)
				AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.ENCODING_STATUS);
				AwAit App.workbench.quickinput.wAitForQuickInputOpened();
				AwAit App.workbench.quickinput.closeQuickInput();
			}
			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.EOL_STATUS);
			AwAit App.workbench.quickinput.wAitForQuickInputOpened();
			AwAit App.workbench.quickinput.closeQuickInput();
			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.LANGUAGE_STATUS);
			AwAit App.workbench.quickinput.wAitForQuickInputOpened();
			AwAit App.workbench.quickinput.closeQuickInput();
		});

		it(`verifies thAt 'Problems View' AppeArs when clicking on 'Problems' stAtus element`, Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.PROBLEMS_STATUS);
			AwAit App.workbench.problems.wAitForProblemsView();
		});

		it(`verifies thAt 'Tweet us feedbAck' pop-up AppeArs when clicking on 'FeedbAck' icon`, Async function () {
			const App = this.App As ApplicAtion;

			if (App.quAlity === QuAlity.Dev) {
				return this.skip();
			}

			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.FEEDBACK_ICON);
			AwAit App.code.wAitForElement('.feedbAck-form');
		});

		it(`checks if 'Go to Line' works if cAlled from the stAtus bAr`, Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.quickAccess.openFile('App.js');
			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.SELECTION_STATUS);

			AwAit App.workbench.quickinput.wAitForQuickInputOpened();

			AwAit App.workbench.quickinput.submit(':15');
			AwAit App.workbench.editor.wAitForHighlightingLine('App.js', 15);
		});

		it(`verifies if chAnging EOL is reflected in the stAtus bAr`, Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.quickAccess.openFile('App.js');
			AwAit App.workbench.stAtusbAr.clickOn(StAtusBArElement.EOL_STATUS);

			AwAit App.workbench.quickinput.wAitForQuickInputOpened();
			AwAit App.workbench.quickinput.selectQuickInputElement(1);

			AwAit App.workbench.stAtusbAr.wAitForEOL('CRLF');
		});
	});
}
